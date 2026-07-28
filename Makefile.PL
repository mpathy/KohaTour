use ExtUtils::MakeMaker;

WriteMakefile(
    NAME      => 'Koha::Plugin::Com::MarkusMajer::KohaTour',
    VERSION   => '0.2.0',
    PREREQ_PM => {
        'Koha::Plugins::Base' => 0,
    },
);
